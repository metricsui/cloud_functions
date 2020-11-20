export default interface SsoPayload {
  user: string
  attributes: {
    credentialType: any[]
    ldap_cn: any[]
    isFromNewLogin: any[]
    nama: any[]
    authenticationDate: any[]
    authenticationMethod: any[]
    successfulAuthenticationHandlers: any[]
    kd_org: any[]
    npm: any[]
    peran_user: any[]
    longTermAuthenticationRequestTokenUsed: any[]
  }
}
