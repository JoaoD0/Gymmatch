from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.usuario import Usuario
from app.services.auth_service import AuthService, CredenciaisInvalidasError

_bearer = HTTPBearer()
_auth_service = AuthService()


def get_auth_service() -> AuthService:
    return _auth_service


def get_usuario_atual(
    credenciais: HTTPAuthorizationCredentials = Depends(_bearer),
    auth_service: AuthService = Depends(get_auth_service),
) -> Usuario:
    try:
        return auth_service.usuario_a_partir_do_token(credenciais.credentials)
    except CredenciaisInvalidasError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
