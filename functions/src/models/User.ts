import SsoPayload from './SsoPayload'
import * as additionalInfo from './additional-info.json'

function getValue(
  attributesEntry: string | any[] | undefined
): string | undefined {
  if (!attributesEntry) {
    return attributesEntry
  }
  return attributesEntry.toString()
}

function getAdditionalInfo(
  orgCode: string
): {
  faculty: string
  study_program: string
  educational_program: string
} | null {
  if (orgCode in additionalInfo) {
    return additionalInfo[orgCode]
  }
  return null
}

export default class User {
  username: string
  name?: string
  role?: string
  orgCode?: string
  npm?: string
  faculty?: string
  studyProgram?: string
  educationalProgram?: string

  constructor(sso_payload: SsoPayload) {
    const { user, attributes } = sso_payload
    this.username = user
    this.name = getValue(attributes.nama)
    this.role = getValue(attributes.peran_user)
    this.orgCode = getValue(attributes.kd_org)
    this.npm = getValue(attributes.npm)
    if (this.orgCode) {
      const additionalInfo = getAdditionalInfo(this.orgCode)
      if (additionalInfo) {
        this.faculty = additionalInfo.faculty
        this.studyProgram = additionalInfo.study_program
        this.educationalProgram = additionalInfo.educational_program
      }
    }
  }

  toPlainObject() {
    const {
      username,
      name,
      role,
      orgCode,
      npm,
      faculty,
      studyProgram,
      educationalProgram,
    } = this
    return {
      username,
      name,
      role,
      orgCode,
      npm,
      faculty,
      studyProgram,
      educationalProgram,
    }
  }
}
