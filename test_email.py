import requests
import json

SERVICE_ID = "service_w2fccgp"
TEMPLATE_ID = "template_ue0peal"
PUBLIC_KEY = "vwcoJIUUH5bkSfzRS"
# PRIVATE_KEY = "..." # We might need this

def test_send():
    url = "https://api.emailjs.com/api/v1.0/email/send"
    payload = {
        "service_id": SERVICE_ID,
        "template_id": TEMPLATE_ID,
        "user_id": PUBLIC_KEY,
        "template_params": {
            "to_email": "test@example.com",
            "to_name": "Test User",
            "message": "Testing from server",
            "otp": "123456"
        }
    }
    
    try:
        res = requests.post(url, json=payload, timeout=15)
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_send()
