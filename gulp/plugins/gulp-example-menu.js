import Vinyl from 'vinyl'
import gutil from 'gulp-util'
import _ from 'lodash'
import path from 'path'
import through from 'through2'

import { parseDocSection } from './util'

const SECTION_ORDER = {
  Themed: 1,
  Types: 2,
  States: 3,
  Content: 4,
  Variations: 5,
  Groups: 6,
  DEFAULT_ORDER: 7,
  Usage: 10,
}

const getSectionOrder = sectionName =>
  _.find(SECTION_ORDER, (val, key) => _.includes(sectionName, key)) || SECTION_ORDER.DEFAULT_ORDER

const pluginName = 'gulp-example-menu'

export default () => {
  const exampleFilesByDisplayName = {}

  function bufferContents(file, enc, cb) {
    if (file.isNull()) {
      cb(null, file)
      return
    }

    if (file.isStream()) {
      cb(new gutil.PluginError(pluginName, 'Streaming is not supported'))
      return
    }

    try {
      // eslint-disable-next-line no-unused-vars
      const [type, displayName, sectionName, exampleName] = _.split(file.path, path.sep).slice(-4)
      const { examples } = parseDocSection(file.contents)

      _.merge(exampleFilesByDisplayName, {
        [displayName]: {
          [sectionName]: {
            order: getSectionOrder(sectionName),
            sectionName,
            examples,
          },
        },
      })

      cb()
    } catch (err) {
      const pluginError = new gutil.PluginError(pluginName, err)
      pluginError.message += `\nFile: ${file.path}.`
      this.emit('error', pluginError)
      // eslint-disable-next-line no-console
      console.log(err)
    }
  }

  function endStream(cb) {
    _.forEach(exampleFilesByDisplayName, (contents, displayName) => {
      const sortedContents = _
        .sortBy(contents, ['order', 'sectionName'])
        .map(({ sectionName, examples }) => ({ sectionName, examples }))

      const file = new Vinyl({
        path: `./${displayName}.examples.json`,
        contents: Buffer.from(JSON.stringify(sortedContents, null, 2)),
      })

      this.push(file)
    })

    cb()
  }

  return through.obj(bufferContents, endStream)
}
