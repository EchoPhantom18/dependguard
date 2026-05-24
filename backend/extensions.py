from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from authlib.integrations.flask_client import OAuth


db = SQLAlchemy()
oauth = OAuth()
mail = Mail()
