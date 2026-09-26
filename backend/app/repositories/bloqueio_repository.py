from app.database import get_cursor
from app.models.bloqueio import Bloqueio


class BloqueioRepository:
    @staticmethod
    def _linha_para_bloqueio(linha: dict) -> Bloqueio:
        return Bloqueio(
            id=linha["id"],
            bloqueador_id=linha["bloqueador_id"],
            bloqueado_id=linha["bloqueado_id"],
            criado_em=linha["criado_em"],
        )

    def criar(self, bloqueio: Bloqueio) -> Bloqueio:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT IGNORE INTO bloqueios (bloqueador_id, bloqueado_id) VALUES (%s, %s)",
                (bloqueio.bloqueador_id, bloqueio.bloqueado_id),
            )
            if cur.lastrowid:
                bloqueio._id = cur.lastrowid
        return bloqueio

    def listar_ids_bloqueados_bidirecional(self, usuario_id: int) -> list[int]:
        """IDs de quem o usuário bloqueou OU de quem bloqueou o usuário."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT bloqueado_id AS id FROM bloqueios WHERE bloqueador_id = %s
                   UNION
                   SELECT bloqueador_id AS id FROM bloqueios WHERE bloqueado_id = %s""",
                (usuario_id, usuario_id),
            )
            linhas = cur.fetchall()
        return [l["id"] for l in linhas]
