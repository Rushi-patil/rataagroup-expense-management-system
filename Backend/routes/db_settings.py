from fastapi import APIRouter
# 1. Import drive_service to talk to Google
from db import db, drive_service 
from maileroo import MailerooClient, EmailAddress
import os
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

router = APIRouter()

# Initialize Maileroo Client
maileroo_client = MailerooClient(os.getenv("MAILEROO_API_KEY"))

# Helper to format bytes into readable sizes (MB, GB)
def format_size(size_bytes):
    if size_bytes == 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(0)
    p = float(size_bytes)
    while p >= 1024 and i < len(size_name)-1:
        p /= 1024
        i += 1
    return f"{p:.2f} {size_name[i]}"

def send_db_size_email():
    try:
        # --- 1. GET MONGODB STATS ---
        db_stats = db.command("dbstats")
        
        mongo_storage_bytes = db_stats["storageSize"] # Physical size on disk
        mongo_limit_bytes = 500 * 1024 * 1024         # 500 MB Limit
        mongo_usage_percent = (mongo_storage_bytes / mongo_limit_bytes) * 100
        
        mongo_details = {
            "used": format_size(mongo_storage_bytes),
            "limit": "500.00 MB",
            "percent": f"{mongo_usage_percent:.2f}%",
            "objects": db_stats["objects"],
            "collections": db_stats["collections"]
        }

        # --- 2. GET GOOGLE DRIVE STATS ---
        drive_details = {
            "used": "0 B", 
            "limit": "15.00 GB", 
            "percent": "0%"
        }
        
        if drive_service:
            try:
                # Fetch quota information from Google Drive
                about = drive_service.about().get(fields="storageQuota").execute()
                quota = about.get("storageQuota", {})
                
                drive_used_bytes = int(quota.get("usage", 0))
                drive_limit_bytes = int(quota.get("limit", 15 * 1024 * 1024 * 1024)) # Default 15GB if missing
                
                drive_percent = (drive_used_bytes / drive_limit_bytes) * 100 if drive_limit_bytes > 0 else 0
                
                drive_details = {
                    "used": format_size(drive_used_bytes),
                    "limit": format_size(drive_limit_bytes),
                    "percent": f"{drive_percent:.2f}%"
                }
            except Exception as e:
                print(f"Failed to fetch Drive stats: {e}")

        # --- 3. PREPARE EMAIL ---
        subject_date = datetime.now().strftime('%Y-%m-%d')
        
        # Plain Text Body
        plain_body = (
            f"STORAGE REPORT - {subject_date}\n\n"
            f"MONGODB (Database: {db.name})\n"
            f"Used: {mongo_details['used']} / {mongo_details['limit']} ({mongo_details['percent']})\n"
            f"Collections: {mongo_details['collections']}\n\n"
            f"GOOGLE DRIVE\n"
            f"Used: {drive_details['used']} / {drive_details['limit']} ({drive_details['percent']})\n"
        )

        # HTML Body
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #2c3e50;">Storage Usage Report</h2>
            <p>Report generated on: <b>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</b></p>
            
            <hr style="border: 0; border-top: 1px solid #eee;">
            
            <h3 style="color: #4DB33D;">🍃 MongoDB Storage ({db.name})</h3>
            <table style="width: 100%; max-width: 500px; border-collapse: collapse;">
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><b>Usage</b></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{mongo_details['used']} / {mongo_details['limit']}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><b>Percentage</b></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <div style="background-color: #eee; width: 100%; height: 20px; border-radius: 4px;">
                            <div style="background-color: #4DB33D; width: {min(mongo_usage_percent, 100)}%; height: 100%; border-radius: 4px;"></div>
                        </div>
                        {mongo_details['percent']}
                    </td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><b>Collections</b></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{mongo_details['collections']}</td>
                </tr>
            </table>

            <h3 style="color: #4285F4;">📁 Google Drive Storage</h3>
            <table style="width: 100%; max-width: 500px; border-collapse: collapse;">
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><b>Usage</b></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{drive_details['used']} / {drive_details['limit']}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><b>Percentage</b></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                         <div style="background-color: #eee; width: 100%; height: 20px; border-radius: 4px;">
                            <div style="background-color: #4285F4; width: {min(drive_percent, 100) if 'drive_percent' in locals() else 0}%; height: 100%; border-radius: 4px;"></div>
                        </div>
                        {drive_details['percent']}
                    </td>
                </tr>
            </table>
            
            <br>
            <p style="font-size: 12px; color: #777;">Regards,<br/><b>Rataa Group System</b></p>
        </body>
        </html>
        """

        email_data = {
            "from": EmailAddress("rataagroup@bfbbc79e67369a72.maileroo.org", "Rataa Group"),
            "to": [EmailAddress("expense.rataagroup@gmail.com")],
            "subject": f"Storage Alert - {subject_date}",
            "plain": plain_body,
            "html": html_body
        }

        # Send email
        maileroo_client.send_basic_email(email_data)
        print(f"[{datetime.now()}] Storage report email sent successfully.")
        
    except Exception as e:
        print(f"[{datetime.now()}] Failed to send storage email: {str(e)}")

# Scheduler to run every 10 days
scheduler = BackgroundScheduler()
scheduler.add_job(send_db_size_email, 'interval', days=10, next_run_time=datetime.now())
scheduler.start()

# Optional route to trigger manually
@router.get("/dbsize/email")
def send_db_size_manual():
    send_db_size_email()
    return {"message": "DB & Drive storage email sent manually."}