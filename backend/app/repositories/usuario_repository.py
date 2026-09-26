from app.database import get_cursor
from app.models.usuario import Usuario, AdminUsuario


class UsuarioRepository:
    """Isola todo o acesso SQL à tabela usuarios. Converte linhas em objetos Usuario/AdminUsuario."""

    @staticmethod
    def _linha_para_usuario(linha: dict) -> Usuario:
        classe = AdminUsuario if linha["tipo"] == "admin" else Usuario
        return classe(
            id=linha["id"],
            nome=linha["nome"],
            email=linha["email"],
            senha_hash=linha["senha_hash"],
            academia_id=linha["academia_id"],
            criado_em=linha["criado_em"],
            status=linha["status"],
        )

    def criar(self, usuario: Usuario) -> Usuario:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO usuarios (nome, email, senha_hash, tipo, academia_id)
                   VALUES (%s, %s, %s, %s, %s)""",
                (usuario.nome, usuario.email, usuario._senha_hash, usuario.tipo, usuario.academia_id),
            )
            usuario._id = cur.lastrowid
        return usuario

    def buscar_por_id(self, usuario_id: int) -> Usuario | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM usuarios WHERE id = %s", (usuario_id,))
            linha = cur.fetchone()
        return self._linha_para_usuario(linha) if linha else None

    def buscar_por_email(self, email: str) -> Usuario | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
            linha = cur.fetchone()
        return self._linha_para_usuario(linha) if linha else None

    def buscar_varios_por_id(self, ids: list[int]) -> list[Usuario]:
        if not ids:
            return []
        placeholders = ",".join(["%s"] * len(ids))
        with get_cursor() as cur:
            cur.execute(f"SELECT * FROM usuarios WHERE id IN ({placeholders})", tuple(ids))
            linhas = cur.fetchall()
        return [self._linha_para_usuario(l) for l in linhas]

    def listar_por_academia(self, academia_id: int, excluir_usuario_id: int,
                             apenas_ativos: bool = False) -> list[Usuario]:
        filtro_status = "AND status = 'ativo'" if apenas_ativos else ""
        with get_cursor() as cur:
            cur.execute(
                f"""SELECT * FROM usuarios
                    WHERE academia_id = %s AND id <> %s {filtro_status}
                    ORDER BY criado_em DESC""",
                (academia_id, excluir_usuario_id),
            )
            linhas = cur.fetchall()
        return [self._linha_para_usuario(l) for l in linhas]

    def atualizar_nome(self, usuario_id: int, nome: str) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE usuarios SET nome = %s WHERE id = %s",
                (nome, usuario_id),
            )

    def atualizar_academia(self, usuario_id: int, academia_id: int | None) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE usuarios SET academia_id = %s WHERE id = %s",
                (academia_id, usuario_id),
            )

    def atualizar_status(self, usuario_id: int, status: str) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE usuarios SET status = %s WHERE id = %s",
                (status, usuario_id),
            )

    def atualizar_senha_hash(self, usuario_id: int, senha_hash: str) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE usuarios SET senha_hash = %s WHERE id = %s",
                (senha_hash, usuario_id),
            )

    def deletar(self, usuario_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM usuarios WHERE id = %s", (usuario_id,))
