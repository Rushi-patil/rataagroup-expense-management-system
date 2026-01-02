from fastapi import APIRouter
from db import db
from maileroo import MailerooClient, EmailAddress
import os
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

router = APIRouter()

# Initialize Maileroo Client
maileroo_client = MailerooClient(os.getenv("MAILEROO_API_KEY"))

def send_db_size_email():
    try:
        # Get DB stats
        db_stats = db.command("dbstats")
        data_size_mb = db_stats["dataSize"] / (1024 * 1024)
        storage_size_mb = db_stats["storageSize"] / (1024 * 1024)
        index_size_mb = db_stats["indexSize"] / (1024 * 1024)

        # Prepare email
        email_data = {
            "from": EmailAddress(
                "rataagroup@bfbbc79e67369a72.maileroo.org",
                "Rataa Group"
            ),
            "to": [EmailAddress("expense.rataagroup@gmail.com")],
            "subject": f"MongoDB Storage Report - {datetime.now().strftime('%Y-%m-%d')}",
            "plain": f"Your MongoDB storage usage report:\nData Size: {data_size_mb:.2f} MB\nStorage Size: {storage_size_mb:.2f} MB\nIndex Size: {index_size_mb:.2f} MB",
            "html": f"""
                <h2>MongoDB Storage Report</h2>
                <p>As of <b>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</b>, your MongoDB database <b>{db.name}</b> storage usage is:</p>
                <ul>
                    <li><b>Data Size:</b> {data_size_mb:.2f} MB</li>
                    <li><b>Storage Size:</b> {storage_size_mb:.2f} MB</li>
                    <li><b>Index Size:</b> {index_size_mb:.2f} MB</li>
                </ul>
                <p>Regards,<br/><b>Rataa Group</b></p>
            """
        }

        # Send email
        maileroo_client.send_basic_email(email_data)
        print(f"[{datetime.now()}] DB size email sent successfully.")
    except Exception as e:
        print(f"[{datetime.now()}] Failed to send DB size email: {str(e)}")

# Scheduler to run every 10 days
scheduler = BackgroundScheduler()
scheduler.add_job(send_db_size_email, 'interval', days=10, next_run_time=datetime.now())
scheduler.start()

# Optional route to trigger manually
@router.get("/dbsize/email")
def send_db_size_manual():
    send_db_size_email()
    return {"message": "DB size email sent manually."}