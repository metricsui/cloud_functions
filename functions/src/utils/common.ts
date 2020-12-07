import { Path } from '../models/Path'

export function pathLabelToPathDocumentId(pathLabel: string): Path | null {
  switch (pathLabel) {
    case 'Data Science & Analytics':
      return Path.dataScienceAnalytics
    case 'Product Design':
      return Path.productDesign
    case 'Product Management':
      return Path.productManagement
    case 'Software Engineering':
      return Path.softwareEngineering
    default:
      return null
  }
}
