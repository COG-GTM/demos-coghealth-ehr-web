// Custom transformer that replaces import.meta.env with process.env
// before passing to ts-jest for TypeScript compilation
const { TsJestTransformer } = require('ts-jest');

class ImportMetaTransformer extends TsJestTransformer {
  processAsync(sourceText, sourcePath, transformOptions) {
    const replaced = sourceText
      .replace(/import\.meta\.env\./g, 'process.env.')
      .replace(/import\.meta\.env/g, 'process.env');
    return super.processAsync(replaced, sourcePath, transformOptions);
  }

  process(sourceText, sourcePath, transformOptions) {
    const replaced = sourceText
      .replace(/import\.meta\.env\./g, 'process.env.')
      .replace(/import\.meta\.env/g, 'process.env');
    return super.process(replaced, sourcePath, transformOptions);
  }
}

module.exports = {
  createTransformer(config) {
    return new ImportMetaTransformer(config);
  },
};
