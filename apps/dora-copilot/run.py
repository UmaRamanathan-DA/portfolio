from app import create_app

if __name__ == "__main__":
    application = create_app("development")
    print("DORA DevOps Copilot — http://127.0.0.1:5000")
    application.run(host="0.0.0.0", port=int(__import__("os").environ.get("PORT", 5000)), debug=True)
