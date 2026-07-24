import os
import time
from collections import defaultdict

import joblib
import numpy as np
from scapy.all import sniff, IP, TCP, UDP

from app.ml.predict import predict_single, get_feature_columns

ARTIFACTS_DIR = "datasets/processed/model_artifacts"
MEDIANS_PATH = os.path.join(ARTIFACTS_DIR, "feature_medians.joblib")

_medians = None


def load_medians() -> dict:
    global _medians
    if _medians is None:
        _medians = joblib.load(MEDIANS_PATH)
    return _medians


def flow_key(pkt):
    """Group packets into flows using a 5-tuple, normalizing direction."""
    ip = pkt[IP]
    if pkt.haslayer(TCP) or pkt.haslayer(UDP):
        proto = "TCP" if pkt.haslayer(TCP) else "UDP"
        sport, dport = pkt.sport, pkt.dport
    else:
        proto, sport, dport = "OTHER", 0, 0

    a, b = (ip.src, sport), (ip.dst, dport)
    if a <= b:
        return (a[0], b[0], a[1], b[1], proto), "fwd"
    return (b[0], a[0], b[1], a[1], proto), "bwd"


def capture_flows(duration_seconds: int) -> dict:
    flows = defaultdict(lambda: {
        "fwd_lengths": [], "bwd_lengths": [],
        "start_time": None, "end_time": None, "dst_port": None,
    })

    def handle_packet(pkt):
        if not pkt.haslayer(IP):
            return
        key, direction = flow_key(pkt)
        flow = flows[key]
        now = time.time()
        length = len(pkt)

        if flow["start_time"] is None:
            flow["start_time"] = now
        flow["end_time"] = now

        if direction == "fwd":
            flow["fwd_lengths"].append(length)
            if flow["dst_port"] is None and (pkt.haslayer(TCP) or pkt.haslayer(UDP)):
                flow["dst_port"] = pkt.dport
        else:
            flow["bwd_lengths"].append(length)

    print(f"Capturing live traffic for {duration_seconds} seconds...")
    sniff(prn=handle_packet, timeout=duration_seconds, store=False)
    print(f"Capture complete. {len(flows)} flows observed.")
    return flows


def flow_to_features(flow: dict) -> dict:
    """Compute real values for the features we can measure; fall back to
    training-set medians for the rest (CICFlowMeter's full feature set is
    not fully replicated here — this is a deliberate, documented simplification)."""
    features = dict(load_medians())

    fwd, bwd = flow["fwd_lengths"], flow["bwd_lengths"]
    all_lengths = fwd + bwd
    duration_us = max((flow["end_time"] - flow["start_time"]) * 1_000_000, 1.0)
    duration_s = duration_us / 1_000_000

    def stat(fn, values, default=0.0):
        return float(fn(values)) if values else default

    features["Destination Port"] = float(flow["dst_port"] or 0)
    features["Flow Duration"] = duration_us
    features["Total Fwd Packets"] = float(len(fwd))
    features["Total Backward Packets"] = float(len(bwd))
    features["Total Length of Fwd Packets"] = float(sum(fwd))
    features["Total Length of Bwd Packets"] = float(sum(bwd))
    features["Fwd Packet Length Max"] = stat(max, fwd)
    features["Fwd Packet Length Min"] = stat(min, fwd)
    features["Fwd Packet Length Mean"] = stat(np.mean, fwd)
    features["Fwd Packet Length Std"] = stat(np.std, fwd)
    features["Bwd Packet Length Max"] = stat(max, bwd)
    features["Bwd Packet Length Min"] = stat(min, bwd)
    features["Bwd Packet Length Mean"] = stat(np.mean, bwd)
    features["Bwd Packet Length Std"] = stat(np.std, bwd)
    features["Flow Bytes/s"] = sum(all_lengths) / duration_s if duration_s > 0 else 0.0
    features["Flow Packets/s"] = len(all_lengths) / duration_s if duration_s > 0 else 0.0
    features["Min Packet Length"] = stat(min, all_lengths)
    features["Max Packet Length"] = stat(max, all_lengths)
    features["Packet Length Mean"] = stat(np.mean, all_lengths)
    features["Packet Length Std"] = stat(np.std, all_lengths)
    features["Packet Length Variance"] = stat(np.var, all_lengths)
    features["Average Packet Size"] = stat(np.mean, all_lengths)
    features["Down/Up Ratio"] = (len(bwd) / len(fwd)) if fwd else 0.0

    return features


def run_live_capture(duration_seconds: int = 8) -> list[dict]:
    flows = capture_flows(duration_seconds)
    required_columns = set(get_feature_columns())

    results = []
    for key, flow in flows.items():
        if not flow["fwd_lengths"] and not flow["bwd_lengths"]:
            continue
        features = flow_to_features(flow)
        if required_columns - set(features.keys()):
            continue

        prediction = predict_single(features)
        src_ip, dst_ip, src_port, dst_port, proto = key
        prediction.update({
            "source_ip": src_ip, "dest_ip": dst_ip,
            "src_port": src_port, "dst_port": dst_port, "protocol": proto,
        })
        results.append(prediction)

    results.sort(key=lambda r: r["risk_score"], reverse=True)
    return results