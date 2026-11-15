import { readFileSync, writeFileSync } from 'node:fs'

const configPath = new URL('../ios/App/App/capacitor.config.json', import.meta.url)
const projectPath = new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url)

const config = JSON.parse(readFileSync(configPath, 'utf8'))
const classes = new Set(config.packageClassList ?? [])
classes.add('LiftoffNativePlugin')
config.packageClassList = [...classes]
writeFileSync(configPath, `${JSON.stringify(config, null, '\t')}\n`)

let project = readFileSync(projectPath, 'utf8')
if (!project.includes('DEVELOPMENT_TEAM = 39AMCG49RK;')) {
  project = project.replaceAll('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = 39AMCG49RK;')
  writeFileSync(projectPath, project)
}

console.log('iOS project stamped with team 39AMCG49RK and the schedule plugin.')
