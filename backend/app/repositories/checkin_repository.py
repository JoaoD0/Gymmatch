from datetime import datetime

from app.database import get_cursor
from app.models.checkin import CheckIn


class CheckInRepository:
    def salvar(self, checkin: CheckIn) -> None:
        """Um check-in por usuário: o novo substitui o anterior."""
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO checkins (usuario_id, feito_em) VALUES (%s, %s)
                   ON DUPLICATE KEY UPDATE feito_em = VALUES(feito_em)""",
                (checkin.usuario_id, checkin.feito_em),
            )

    def buscar(self, usuario_id: int) -> CheckIn | None:
        with get_cursor() as cur:
            cur.execute("SELECT usuario_id, feito_em FROM checkins WHERE usuario_id = %s", (usuario_id,))
            linha = cur.fetchone()
        return CheckIn(linha["usuario_id"], linha["feito_em"]) if linha else None

    def deletar(self, usuario_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM checkins WHERE usuario_id = %s", (usuario_id,))

    def listar_usuarios_desde(self, feito_depois_de: datetime) -> list[int]:
        with get_cursor() as cur:
            cur.execute("SELECT usuario_id FROM checkins WHERE feito_em > %s", (feito_depois_de,))
            linhas = cur.fetchall()
        return [l["usuario_id"] for l in linhas]
