from app.database import get_cursor
from app.models.recusa import Recusa


class RecusaRepository:
    @staticmethod
    def _linha_para_recusa(linha: dict) -> Recusa:
        return Recusa(
            id=linha["id"],
            de_usuario_id=linha["de_usuario_id"],
            para_usuario_id=linha["para_usuario_id"],
            criado_em=linha["criado_em"],
        )

    def criar(self, recusa: Recusa) -> Recusa:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT IGNORE INTO recusas (de_usuario_id, para_usuario_id) VALUES (%s, %s)",
                (recusa.de_usuario_id, recusa.para_usuario_id),
            )
            if cur.lastrowid:
                recusa._id = cur.lastrowid
        return recusa

    def listar_ids_recusados_por_usuario(self, usuario_id: int) -> list[int]:
        with get_cursor() as cur:
            cur.execute("SELECT para_usuario_id FROM recusas WHERE de_usuario_id = %s", (usuario_id,))
            linhas = cur.fetchall()
        return [l["para_usuario_id"] for l in linhas]
