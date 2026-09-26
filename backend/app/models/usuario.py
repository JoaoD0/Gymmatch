from datetime import datetime
from passlib.hash import bcrypt

STATUS_VALIDOS = {"ativo", "pausado"}


class Usuario:
    """Representa um usuário comum do GymMatch. Classe base para herança (ver AdminUsuario)."""

    def __init__(self, id: int | None, nome: str, email: str, senha_hash: str,
                 academia_id: int | None = None, criado_em: datetime | None = None,
                 status: str = "ativo"):
        self._id = id
        self._nome = nome
        self._email = email
        self._senha_hash = senha_hash
        self._academia_id = academia_id
        self._criado_em = criado_em or datetime.now()
        self.status = status

    # ---------- properties (encapsulamento) ----------
    @property
    def id(self) -> int | None:
        return self._id

    @property
    def nome(self) -> str:
        return self._nome

    @nome.setter
    def nome(self, valor: str):
        if not valor or not valor.strip():
            raise ValueError("Nome não pode ser vazio")
        self._nome = valor.strip()

    @property
    def email(self) -> str:
        return self._email

    @property
    def academia_id(self) -> int | None:
        return self._academia_id

    @academia_id.setter
    def academia_id(self, valor: int | None):
        self._academia_id = valor

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    @property
    def tipo(self) -> str:
        return "comum"

    @property
    def status(self) -> str:
        return self._status

    @status.setter
    def status(self, valor: str):
        if valor not in STATUS_VALIDOS:
            raise ValueError(f"Status inválido: {valor}")
        self._status = valor

    def pausado(self) -> bool:
        return self._status == "pausado"

    # ---------- comportamento ----------
    @staticmethod
    def gerar_hash_senha(senha: str) -> str:
        return bcrypt.hash(senha)

    def verificar_senha(self, senha: str) -> bool:
        return bcrypt.verify(senha, self._senha_hash)

    def permissoes(self) -> list[str]:
        """Método pensado para ser sobrescrito por subclasses (polimorfismo)."""
        return ["ver_discover", "curtir", "chat"]

    def pode_excluir_post(self, post) -> bool:
        """Usuário comum só pode apagar os próprios posts. AdminUsuario sobrescreve isso."""
        return post.autor_id == self._id

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "nome": self._nome,
            "email": self._email,
            "tipo": self.tipo,
            "academia_id": self._academia_id,
            "status": self._status,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self._id} email={self._email}>"


class AdminUsuario(Usuario):
    """Usuário com privilégios administrativos. Herda de Usuario e estende suas permissões."""

    @property
    def tipo(self) -> str:
        return "admin"

    def permissoes(self) -> list[str]:
        return super().permissoes() + ["gerenciar_academias", "gerenciar_usuarios"]

    def pode_excluir_post(self, post) -> bool:
        return True
