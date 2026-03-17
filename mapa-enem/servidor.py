#!/usr/bin/env python3
# filepath: /Users/luishmj/Desktop/slides-lab/start_servers.py

import subprocess
import threading
import time
import webbrowser
import os
import signal
import sys

class MultiServerManager:
    def __init__(self):
        self.processes = []
        self.servers = [
            {
                'name': 'Projeto Principal',
                'path': '/Users/luishmj/Desktop/slides-lab',
                'port': 8000,
                'url': 'http://localhost:8000',
                'description': 'Mapa interativo do Brasil'
            },
            {
                'name': 'Desigualdade',
                'path': '/Users/luishmj/Desktop/slides-lab/desigualdade',
                'port': 3000,
                'url': 'http://localhost:3000',
                'description': 'Análise de desigualdade educacional'
            },
            {
                'name': 'Barace (Ranking)',
                'path': '/Users/luishmj/Desktop/slides-lab/barace',
                'port': 4000,
                'url': 'http://localhost:4000/ranking.html',
                'description': 'Ranking Histórico ENEM - Redação'
            },
            {
                'name': 'Matriculas',
                'path': '/Users/luishmj/Desktop/slides-lab/matriculas',
                'port': 9000,
                'url': 'http://localhost:9000/brasil.html',
                'description': 'Engajamento e Matriculados no ENEM'
            }
        ]

    def start_server(self, server_config):
        """Inicia um servidor HTTP em uma pasta específica"""
        try:
            print(f"🚀 Iniciando {server_config['name']} na porta {server_config['port']}...")
            
            # Mudar para o diretório do servidor
            os.chdir(server_config['path'])
            
            # Iniciar servidor HTTP do Python
            process = subprocess.Popen([
                'python3', '-m', 'http.server', str(server_config['port'])
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.processes.append(process)
            print(f"✅ {server_config['name']} rodando em {server_config['url']}")
            
        except Exception as e:
            print(f"❌ Erro ao iniciar {server_config['name']}: {e}")

    def start_all_servers(self):
        """Inicia todos os servidores em threads separadas"""
        print("🌐 Iniciando Multiple Server Manager...")
        print("=" * 60)
        
        threads = []
        for server in self.servers:
            thread = threading.Thread(target=self.start_server, args=(server,))
            thread.daemon = True
            thread.start()
            threads.append(thread)
            time.sleep(1)  # Aguardar 1 segundo entre cada servidor
        
        # Aguardar todos os threads iniciarem
        for thread in threads:
            thread.join()
        
        time.sleep(3)  # Aguardar servidores ficarem prontos
        
        print("\n" + "=" * 60)
        print("🎉 TODOS OS SERVIDORES ESTÃO RODANDO!")
        print("=" * 60)
        
        # Exibir resumo
        self.show_summary()
        
        # Abrir navegadores (opcional)
        self.open_browsers()

    def show_summary(self):
        """Exibe um resumo de todos os servidores ativos"""
        print("\n📊 RESUMO DOS SERVIDORES ATIVOS:")
        print("-" * 60)
        
        for i, server in enumerate(self.servers, 1):
            print(f"{i}. {server['name']}")
            print(f"   📁 Pasta: {server['path'].split('/')[-1]}")
            print(f"   🌐 URL: {server['url']}")
            print(f"   📝 Descrição: {server['description']}")
            print()

    def open_browsers(self):
        """Pergunta se deseja abrir os navegadores automaticamente"""
        response = input("🌐 Deseja abrir todos os sites no navegador? (s/n): ").lower().strip()
        
        if response in ['s', 'sim', 'y', 'yes']:
            print("\n🚀 Abrindo navegadores...")
            for server in self.servers:
                webbrowser.open(server['url'])
                time.sleep(1)
            print("✅ Todos os sites foram abertos!")

    def stop_all_servers(self):
        """Para todos os servidores"""
        print("\n🛑 Parando todos os servidores...")
        
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            except Exception as e:
                print(f"Erro ao parar processo: {e}")
        
        print("✅ Todos os servidores foram parados!")

    def signal_handler(self, sig, frame):
        """Manipula o sinal Ctrl+C"""
        print("\n\n🛑 Interrupção detectada (Ctrl+C)")
        self.stop_all_servers()
        sys.exit(0)

    def keep_alive(self):
        """Mantém o script rodando até Ctrl+C"""
        signal.signal(signal.SIGINT, self.signal_handler)
        
        print("\n⌨️  COMANDOS:")
        print("• Para parar todos os servidores: Ctrl+C")
        print("• Para manter rodando: deixe este terminal aberto")
        print("\n⏳ Servidores rodando... (Ctrl+C para parar)")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.signal_handler(None, None)

def main():
    """Função principal"""
    print("🔥 SLIDES-LAB MULTI-SERVER MANAGER")
    print("=" * 60)
    
    manager = MultiServerManager()
    
    try:
        manager.start_all_servers()
        manager.keep_alive()
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        manager.stop_all_servers()

if __name__ == "__main__":
    main()