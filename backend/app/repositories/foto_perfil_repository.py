from app.database import get_cursor
from app.models.foto_perfil import FotoPerfil


class FotoPerfilRepository:
    @staticmethod
    def _linha_para_foto(linha: dict) -> FotoPerfil:
        return FotoPerfil(
            id=linha["id"],
            usuario_id=linha["usuario_id"],
            url=linha["url"],
            posicao=linha["posicao"],
            criado_em=linha["criado_em"],
        )

    def listar_por_usuario(self, usuario_id: int) -> list[FotoPerfil]:
        with get_cursor() as cur:
            cur.execute(
                "SELECT * FROM fotos_perfil WHERE usuario_id = %s ORDER BY posicao ASC",
                (usuario_id,),
            )
            linhas = cur.fetchall()
        return [self._linha_para_foto(l) for l in linhas]

    def contar_por_usuario(self, usuario_id: int) -> int:
        with get_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM fotos_perfil WHERE usuario_id = %s", (usuario_id,))
            return cur.fetchone()["total"]

    def buscar_por_id(self, foto_id: int) -> FotoPerfil | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM fotos_perfil WHERE id = %s", (foto_id,))
            linha = cur.fetchone()
        return self._linha_para_foto(linha) if linha else None

    def criar(self, foto: FotoPerfil) -> FotoPerfil:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO fotos_perfil (usuario_id, url, posicao) VALUES (%s, %s, %s)",
                (foto.usuario_id, foto.url, foto.posicao),
            )
            foto._id = cur.lastrowid
        return foto

    def deletar(self, foto_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM fotos_perfil WHERE id = %s", (foto_id,))

    def trocar_posicoes(self, foto_a_id: int, posicao_a: int, foto_b_id: int, posicao_b: int) -> None:
        """Troca as posições de duas fotos em uma única transação."""
        with get_cursor(commit=True) as cur:
            cur.execute("UPDATE fotos_perfil SET posicao = %s WHERE id = %s", (posicao_b, foto_a_id))
            cur.execute("UPDATE fotos_perfil SET posicao = %s WHERE id = %s", (posicao_a, foto_b_id))
