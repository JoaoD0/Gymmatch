from app.database import get_cursor
from app.models.denuncia import Denuncia


class DenunciaRepository:
    def criar(self, denuncia: Denuncia) -> Denuncia:
        """INSERT IGNORE: as UNIQUE (denunciante_id, move_id) e (denunciante_id, post_id) evitam
        denunciar o mesmo move/post duas vezes (denúncias de chat, com move_id e post_id nulos,
        nunca colidem entre si — MySQL trata cada NULL como distinto nessas chaves)."""
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT IGNORE INTO denuncias (denunciante_id, denunciado_id, motivo, move_id, post_id)
                   VALUES (%s, %s, %s, %s, %s)""",
                (denuncia.denunciante_id, denuncia.denunciado_id, denuncia.motivo, denuncia.move_id, denuncia.post_id),
            )
            denuncia._id = cur.lastrowid or None
        return denuncia
