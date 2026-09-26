from app.database import get_cursor
from app.models.curtida import Curtida


class CurtidaRepository:
    @staticmethod
    def _linha_para_curtida(linha: dict) -> Curtida:
        return Curtida(
            id=linha["id"],
            de_usuario_id=linha["de_usuario_id"],
            para_usuario_id=linha["para_usuario_id"],
            criado_em=linha["criado_em"],
        )

    def criar(self, curtida: Curtida) -> Curtida:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT IGNORE INTO curtidas (de_usuario_id, para_usuario_id)
                   VALUES (%s, %s)""",
                (curtida.de_usuario_id, curtida.para_usuario_id),
            )
            if cur.lastrowid:
                curtida._id = cur.lastrowid
        return curtida

    def existe_curtida_reciproca(self, de_usuario_id: int, para_usuario_id: int) -> bool:
        """Verifica se para_usuario_id já curtiu de_usuario_id antes (curtida mútua)."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT 1 FROM curtidas
                   WHERE de_usuario_id = %s AND para_usuario_id = %s
                   LIMIT 1""",
                (para_usuario_id, de_usuario_id),
            )
            return cur.fetchone() is not None

    def contar_hoje_por_usuario(self, de_usuario_id: int) -> int:
        with get_cursor() as cur:
            cur.execute(
                """SELECT COUNT(*) AS total FROM curtidas
                   WHERE de_usuario_id = %s AND DATE(criado_em) = CURDATE()""",
                (de_usuario_id,),
            )
            return cur.fetchone()["total"]

    def deletar(self, de_usuario_id: int, para_usuario_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "DELETE FROM curtidas WHERE de_usuario_id = %s AND para_usuario_id = %s",
                (de_usuario_id, para_usuario_id),
            )

    _FILTRO_PENDENTES = """
        AND NOT EXISTS (
            SELECT 1 FROM matches m
            WHERE m.usuario1_id = LEAST(c.de_usuario_id, %s)
              AND m.usuario2_id = GREATEST(c.de_usuario_id, %s)
        )
        AND NOT EXISTS (
            SELECT 1 FROM recusas r WHERE r.de_usuario_id = %s AND r.para_usuario_id = c.de_usuario_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM bloqueios b
            WHERE (b.bloqueador_id = %s AND b.bloqueado_id = c.de_usuario_id)
               OR (b.bloqueador_id = c.de_usuario_id AND b.bloqueado_id = %s)
        )
    """

    def listar_recebidas_pendentes(self, usuario_id: int) -> list[Curtida]:
        """Quem curtiu usuario_id e ainda não formou match, não foi recusado nem bloqueado."""
        with get_cursor() as cur:
            cur.execute(
                f"""SELECT c.* FROM curtidas c
                    WHERE c.para_usuario_id = %s {self._FILTRO_PENDENTES}
                    ORDER BY c.criado_em DESC""",
                (usuario_id, usuario_id, usuario_id, usuario_id, usuario_id, usuario_id),
            )
            linhas = cur.fetchall()
        return [self._linha_para_curtida(l) for l in linhas]

    def contar_recebidas_pendentes(self, usuario_id: int) -> int:
        with get_cursor() as cur:
            cur.execute(
                f"""SELECT COUNT(*) AS total FROM curtidas c
                    WHERE c.para_usuario_id = %s {self._FILTRO_PENDENTES}""",
                (usuario_id, usuario_id, usuario_id, usuario_id, usuario_id, usuario_id),
            )
            return cur.fetchone()["total"]

    def listar_ids_curtidos_por_usuario(self, usuario_id: int) -> list[int]:
        with get_cursor() as cur:
            cur.execute("SELECT para_usuario_id FROM curtidas WHERE de_usuario_id = %s", (usuario_id,))
            linhas = cur.fetchall()
        return [l["para_usuario_id"] for l in linhas]
