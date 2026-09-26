import os
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError

from app.models.usuario import Usuario
from app.repositories.foto_perfil_repository import FotoPerfilRepository
from app.repositories.perfil_repository import PerfilRepository
from app.repositories.usuario_repository import UsuarioRepository

JWT_SECRET = os.getenv("JWT_SECRET", "troque-este-segredo-em-producao")
JWT_ALGORITHM = "HS256"
JWT_EXPIRA_MINUTOS = 60 * 24  # 24h
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


class CredenciaisInvalidasError(Exception):
    pass


class EmailJaCadastradoError(Exception):
    pass


class SenhaAtualIncorretaError(Exception):
    pass


class AuthService:
    def __init__(self, usuario_repository: UsuarioRepository | None = None,
                 perfil_repository: PerfilRepository | None = None,
                 foto_perfil_repository: FotoPerfilRepository | None = None):
        self._usuarios = usuario_repository or UsuarioRepository()
        self._perfis = perfil_repository or PerfilRepository()
        self._fotos = foto_perfil_repository or FotoPerfilRepository()

    def cadastrar(self, nome: str, email: str, senha: str, academia_id: int | None = None) -> Usuario:
        if self._usuarios.buscar_por_email(email):
            raise EmailJaCadastradoError(f"Já existe uma conta com o email {email}")

        senha_hash = Usuario.gerar_hash_senha(senha)
        usuario = Usuario(id=None, nome=nome, email=email, senha_hash=senha_hash,
                           academia_id=academia_id)
        return self._usuarios.criar(usuario)

    def login(self, email: str, senha: str) -> tuple[Usuario, str]:
        usuario = self._usuarios.buscar_por_email(email)
        if not usuario or not usuario.verificar_senha(senha):
            raise CredenciaisInvalidasError("Email ou senha inválidos")
        token = self.gerar_token(usuario)
        return usuario, token

    def gerar_token(self, usuario: Usuario) -> str:
        expira = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRA_MINUTOS)
        payload = {"sub": str(usuario.id), "exp": expira}
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    def usuario_a_partir_do_token(self, token: str) -> Usuario:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except JWTError:
            raise CredenciaisInvalidasError("Token inválido ou expirado")

        usuario_id = int(payload["sub"])
        usuario = self._usuarios.buscar_por_id(usuario_id)
        if not usuario:
            raise CredenciaisInvalidasError("Usuário do token não existe mais")
        return usuario

    def trocar_senha(self, usuario: Usuario, senha_atual: str, nova_senha: str) -> None:
        if not usuario.verificar_senha(senha_atual):
            raise SenhaAtualIncorretaError("Senha atual incorreta")
        novo_hash = Usuario.gerar_hash_senha(nova_senha)
        self._usuarios.atualizar_senha_hash(usuario.id, novo_hash)

    def deletar_conta(self, usuario: Usuario) -> None:
        """Remove a conta e os arquivos de upload associados (foto principal + galeria)."""
        caminhos = []

        perfil = self._perfis.buscar_por_usuario(usuario.id)
        if perfil and perfil.foto_url:
            caminhos.append(perfil.foto_url)

        for foto in self._fotos.listar_por_usuario(usuario.id):
            caminhos.append(foto.url)

        self._usuarios.deletar(usuario.id)

        for url in caminhos:
            caminho_absoluto = os.path.join(UPLOADS_DIR, os.path.basename(url))
            if os.path.isfile(caminho_absoluto):
                os.remove(caminho_absoluto)
