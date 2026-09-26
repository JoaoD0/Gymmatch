from app.models.denuncia import Denuncia
from app.models.post import Post, PostCheckin, PostManual, PostRecorde
from app.models.usuario import Usuario
from app.repositories.curtida_post_repository import CurtidaPostRepository
from app.repositories.denuncia_repository import DenunciaRepository
from app.repositories.post_repository import PostRepository


class SemAcademiaError(Exception):
    pass


class PostNaoEncontradoError(Exception):
    pass


class SemPermissaoParaExcluirError(Exception):
    pass


class DenunciarProprioPostError(Exception):
    pass


class FeedService:
    def __init__(self, post_repository: PostRepository | None = None,
                 curtida_repository: CurtidaPostRepository | None = None,
                 denuncia_repository: DenunciaRepository | None = None):
        self._posts = post_repository or PostRepository()
        self._curtidas = curtida_repository or CurtidaPostRepository()
        self._denuncias = denuncia_repository or DenunciaRepository()

    def listar(self, usuario: Usuario, antes_de_id: int | None) -> dict:
        if not usuario.academia_id:
            raise SemAcademiaError("Usuário precisa estar vinculado a uma academia para ver o feed")

        linhas, tem_mais = self._posts.listar_da_academia(usuario.academia_id, usuario.id, antes_de_id)
        posts = []
        for linha in linhas:
            post = PostRepository._linha_para_post(linha)
            item = post.to_dict()
            item["autor"] = {"id": post.autor_id, "nome": linha["autor_nome"], "foto_url": linha["autor_foto_url"]}
            item["curtidas_total"] = linha["curtidas_total"]
            item["curtido_por_mim"] = bool(linha["curtido_por_mim"])
            item["pode_excluir"] = usuario.pode_excluir_post(post)
            posts.append(item)
        return {"posts": posts, "tem_mais": tem_mais}

    def contar_novos(self, usuario: Usuario, depois_de_id: int) -> int:
        if not usuario.academia_id:
            return 0
        return self._posts.contar_novos(usuario.academia_id, usuario.id, depois_de_id)

    def publicar(self, usuario: Usuario, texto: str | None, foto_url: str | None) -> dict:
        if not usuario.academia_id:
            raise SemAcademiaError("Usuário precisa estar vinculado a uma academia para publicar")

        post = PostManual(id=None, autor_id=usuario.id, academia_id=usuario.academia_id,
                           texto=texto, foto_url=foto_url)
        post = self._posts.criar(post)

        item = post.to_dict()
        item["curtidas_total"] = 0
        item["curtido_por_mim"] = False
        item["pode_excluir"] = True
        return item

    def excluir(self, usuario: Usuario, post_id: int) -> Post:
        post = self._posts.buscar_por_id(post_id)
        if not post:
            raise PostNaoEncontradoError("Post não encontrado")
        if not usuario.pode_excluir_post(post):
            raise SemPermissaoParaExcluirError("Você não pode apagar este post")
        self._posts.deletar(post_id)
        return post

    def _buscar_post_da_academia(self, usuario: Usuario, post_id: int) -> Post:
        post = self._posts.buscar_por_id(post_id)
        if not post or post.academia_id != usuario.academia_id:
            raise PostNaoEncontradoError("Post não encontrado")
        return post

    def curtir(self, usuario: Usuario, post_id: int) -> dict:
        post = self._buscar_post_da_academia(usuario, post_id)
        self._curtidas.curtir(post.id, usuario.id)
        return {"curtidas_total": self._curtidas.contar(post.id), "curtido_por_mim": True}

    def descurtir(self, usuario: Usuario, post_id: int) -> dict:
        post = self._buscar_post_da_academia(usuario, post_id)
        self._curtidas.descurtir(post.id, usuario.id)
        return {"curtidas_total": self._curtidas.contar(post.id), "curtido_por_mim": False}

    def denunciar(self, usuario: Usuario, post_id: int) -> None:
        post = self._posts.buscar_por_id(post_id)
        if not post:
            raise PostNaoEncontradoError("Post não encontrado")
        if post.autor_id == usuario.id:
            raise DenunciarProprioPostError("Não é possível denunciar o próprio post")

        self._denuncias.criar(Denuncia(
            id=None, denunciante_id=usuario.id, denunciado_id=post.autor_id,
            motivo="comportamento_inadequado", post_id=post_id,
        ))

    def publicar_checkin(self, usuario: Usuario) -> None:
        if not usuario.academia_id:
            return
        post = PostCheckin(id=None, autor_id=usuario.id, academia_id=usuario.academia_id,
                            texto="Chegou na academia 💪")
        self._posts.criar(post)

    def publicar_recorde(self, usuario: Usuario, recordes_que_subiram: dict[str, float]) -> None:
        """recordes_que_subiram: {"Supino": 100.0, ...} — só os exercícios cujo PR aumentou
        nesse salvamento. Se mais de um subir junto, publica um post só, listando todos."""
        if not usuario.academia_id or not recordes_que_subiram:
            return

        linhas = [f"Novo recorde no {nome}: {valor:g} kg 💪" for nome, valor in recordes_que_subiram.items()]
        texto = linhas[0] if len(linhas) == 1 else "\n".join(linhas)

        post = PostRecorde(id=None, autor_id=usuario.id, academia_id=usuario.academia_id, texto=texto)
        self._posts.criar(post)
