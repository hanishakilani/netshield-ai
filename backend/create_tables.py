from app.db.postgres import Base, engine
from app.models.user import User
from app.models.login_history import LoginHistory

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully.")