from gevent.pywsgi import WSGIServer
from app import create_app
from config.settings import SERVER_IP, SERVER_PORT
from colorama import init , Fore


# Init Coloroma
init(autoreset=True)

app = create_app()

def main():
    print(Fore.GREEN + "[SERVER]: Server started successfully!")
    print(Fore.LIGHTBLUE_EX + f"[SERVER]: Server is running on : {SERVER_IP}:{SERVER_PORT}")
    http_server = WSGIServer((SERVER_IP, SERVER_PORT), app)
    http_server.serve_forever()

if __name__ == "__main__":
    main()
