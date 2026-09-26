from app.database import get_cursor
from app.models.boost import Boost


class BoostRepository:
    @staticmethod
    def _linha_para_boost(linha: dict) -> Boost:
        return Boost(
            id=linha["id"],
            usuario_id=linha["usuario_id"],
            ativado_em=linha["ativado_em"],
            expira_em=linha["expira_em"],
        )

    def criar(self, boost: Boost) -> Boost:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO boosts (usuario_id, ativado_em, expira_em) VALUES (%s, %s, %s)",
                (boost.usuario_id, boost.ativado_em, boost.expira_em),
            )
            boost._id = cur.lastrowid
        return boost

    def buscar_ativo_por_usuario(self, usuario_id: int) -> Boost | None:
        with get_cursor() as cur:
            cur.execute(
                """SELECT * FROM boosts
                   WHERE usuario_id = %s AND expira_em > NOW()
                   ORDER BY expira_em DESC LIMIT 1""",
                (usuario_id,),
            )
            linha = cur.fetchone()
        return self._linha_para_boost(linha) if linha else None

    def listar_usuarios_com_boost_ativo(self) -> list[int]:
        """IDs de usuários com boost ativo agora, usado para priorizar no Discover."""
        with get_cursor() as cur:
            cur.execute("SELECT DISTINCT usuario_id FROM boosts WHERE expira_em > NOW()")
            linhas = cur.fetchall()
        return [l["usuario_id"] for l in linhas]
