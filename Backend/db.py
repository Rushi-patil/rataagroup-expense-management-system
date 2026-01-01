from pymongo import MongoClient
import os
from dotenv import load_dotenv
import gridfs

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["ExpenseDB"]     # your database name
employee_collection = db["Employees"]
expense_type_collection = db["ExpenseTypes"]
expenses_collection = db["ExpensesCollection"]
payment_mode_collection = db["PaymentModeCollection"]
fs = gridfs.GridFS(db)