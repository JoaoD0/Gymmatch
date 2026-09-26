from app.database import get_cursor
from app.models.mensagem import Mensagem


class MensagemRepository:
    @staticmethod
    def _linha_para_mensagem(linha: dict) -> Mensagem:
        return Mensagem(
            id=linha["id"],
            match_id=linha["match_id"],
            remetente_id=linha["remetente_id"],
            texto=linha["texto"],
            criado_em=linha["criado_em"],
        )

    def criar(self, mensagem: Mensagem) -> Mensagem:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO mensagens (match_id, remetente_id, texto)
                   VALUES (%s, %s, %s)""",
                (mensagem.match_id, mensagem.remetente_id, mensagem.texto),
            )
            mensagem._id = cur.lastrowid
        return mensagem

    def listar_por_match(self, match_id: int, apos_id: int | None = None) -> list[Mensagem]:
        with get_cursor() as cur:
            if apos_id is not None:
                cur.execute(
                    "SELECT * FROM mensagens WHERE match_id = %s AND id > %s ORDER BY criado_em ASC",
                    (match_id, apos_id),
                )
            else:
                cur.execute(
                    "SELECT * FROM mensagens WHERE match_id = %s ORDER BY criado_em ASC",
                    (match_id,),
                )
            linhas = cur.fetchall()
        return [self._linha_para_mensagem(l) for l in linhas]

    def buscar_ultimas_por_matches(self, match_ids: list[int]) -> dict[int, Mensagem]:
        """Última mensagem de cada match, numa única query (evita N+1)."""
        if not match_ids:
            return {}
        placeholders = ",".join(["%s"] * len(match_ids))
        with get_cursor() as cur:
            cur.execute(
                f"""SELECT msg.* FROM mensagens msg
                    INNER JOIN (
                        SELECT match_id, MAX(id) AS max_id FROM mensagens
                        WHERE match_id IN ({placeholders})
                        GROUP BY match_id
                    ) ultimas ON ultimas.match_id = msg.match_id AND ultimas.max_id = msg.id""",
                tuple(match_ids),
            )
            linhas = cur.fetchall()
        return {l["match_id"]: self._linha_para_mensagem(l) for l in linhas}
