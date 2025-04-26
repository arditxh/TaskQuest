from flask import Flask, request
import firebase_admin
from firebase_admin import credentials, firestore, auth

app = Flask(__name__)

cred = credentials.Certificate("assets\key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.route('/login', methods=['POST'])
def login():
        id = request.headers.get('Authorization').split(' ').pop()
        try:
            decode = auth.verify_id_token(id)
            uid = decode['uid']
            return 'User authenticated successfully'
        except auth.InvalidIdTokenError:
            return 'Invalid ID token', 401

@app.route('/signup', methods=['POST'])
def signup():
    email = request.form['email']
    password = request.form['password']
    try:
        user = auth.create_user(email=email, password=password)
        return 'User created successfully'
    except auth.AuthError as e:
        return str(e)