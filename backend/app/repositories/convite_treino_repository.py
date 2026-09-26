from datetime import datetime

from app.database import get_cursor
from app.models.convite_treino import ConviteTreino


class ConviteTreinoRepository:
    @staticmethod
    def linha_para_convite(linha: dict) -> ConviteTreino:
        return ConviteTreino(
            id=linha["id"],
            remetente_id=linha["remetente_id"],
            destinatario_id=linha["destinatario_id"],
            academia_id=linha["academia_id"],
            agendado_para=linha["agendado_para"],
            status=linha["status"],
            criado_em=linha["criado_em"],
            respondido_em=linha["respondido_em"],
        )

    def criar(self, convite: ConviteTreino) -> ConviteTreino:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO convites_treino (remetente_id, destinatario_id, academia_id, agendado_para, status)
                   VALUES (%s, %s, %s, %s, %s)""",
                (convite.remetente_id, convite.destinatario_id, convite.academia_id,
                 convite.agendado_para, convite.status.value),
            )
            convite._id = cur.lastrowid
        return convite

    def buscar_por_id(self, convite_id: int) -> ConviteTreino | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM convites_treino WHERE id = %s", (convite_id,))
            linha = cur.fetchone()
        return self.linha_para_convite(linha) if linha else None

    def salvar_status(self, convite: ConviteTreino) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE convites_treino SET status = %s, respondido_em = %s WHERE id = %s",
                (convite.status.value, convite.respondido_em, convite.id),
            )

    def existe_pendente_no_horario(self, usuario_a: int, usuario_b: int, agendado_para: datetime) -> bool:
        with get_cursor() as cur:
            cur.execute(
                """SELECT 1 FROM convites_treino
                   WHERE status = 'pendente' AND agendado_para = %s
                     AND ((remetente_id = %s AND destinatario_id = %s)
                       OR (remetente_id = %s AND destinatario_id = %s))
                   LIMIT 1""",
                (agendado_para, usuario_a, usuario_b, usuario_b, usuario_a),
            )
            return cur.fetchone() is not None

    def listar_do_usuario(self, usuario_id: int) -> list[dict]:
        """Convites enviados ou recebidos, já com o outro participante e a academia (uma query)."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT c.*,
                          o.id AS outro_id, o.nome AS outro_nome, p.foto_url AS outro_foto_url,
                          a.nome AS academia_nome
                   FROM convites_treino c
                   JOIN usuarios o ON o.id = IF(c.remetente_id = %s, c.destinatario_id, c.remetente_id)
                   LEFT JOIN perfis p ON p.usuario_id = o.id
                   JOIN academias a ON a.id = c.academia_id
                   WHERE c.remetente_id = %s OR c.destinatario_id = %s
                   ORDER BY c.agendado_para ASC, c.id ASC""",
                (usuario_id, usuario_id, usuario_id),
            )
            return cur.fetchall()

    def contar_pendentes_recebidos(self, usuario_id: int) -> int:
        with get_cursor() as cur:
            cur.execute(
                """SELECT COUNT(*) AS total FROM convites_treino
                   WHERE destinatario_id = %s AND status = 'pendente' AND agendado_para > NOW()""",
                (usuario_id,),
            )
            return cur.fetchone()["total"]
