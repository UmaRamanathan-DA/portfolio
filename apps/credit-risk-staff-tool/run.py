import os

from app import create_app

if __name__ == "__main__":
    application = create_app("development")
    print("LoanTap Underwriting Console — http://127.0.0.1:5002")
    application.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5002)), debug=True)
