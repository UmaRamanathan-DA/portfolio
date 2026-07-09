from app import create_app

if __name__ == "__main__":
    application = create_app("development")
    port = int(__import__("os").environ.get("PORT", 5001))
    print(f"Ksara Decor Shop — http://127.0.0.1:{port}")
    application.run(host="0.0.0.0", port=port, debug=True)
