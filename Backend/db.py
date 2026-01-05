# Backend/db.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["ExpenseDB"]

employee_collection = db["Employees"]
expense_type_collection = db["ExpenseTypes"]
expenses_collection = db["ExpensesCollection"]
payment_mode_collection = db["PaymentModeCollection"]
user_groups_collection = db["UserGroupsCollection"]

# --- NEW GOOGLE DRIVE SETUP (OAuth2) ---
TOKEN_FILE = "token.json"
drive_service = None
creds = None

if os.path.exists(TOKEN_FILE):
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_FILE) # <--- Assign to global variable
        drive_service = build('drive', 'v3', credentials=creds)
        print("✅ Google Drive Connected via OAuth2")
    except Exception as e:
        print(f"❌ Failed to load Google Drive Token: {e}")