// Custom ts-jest AST transformer that replaces import.meta.env with process.env
// This allows testing Vite-based source files that use import.meta.env in Jest (CommonJS)
const ts = require('typescript');

const name = 'import-meta-env-transform';
const version = '1';

function factory() {
  return function transformer(context) {
    return function visitor(sourceFile) {
      function visit(node) {
        // Replace import.meta.env.X with process.env.X
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isMetaProperty(node.expression.expression) &&
          node.expression.name.text === 'env'
        ) {
          return ts.factory.createPropertyAccessExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('process'),
              ts.factory.createIdentifier('env')
            ),
            node.name
          );
        }

        // Replace import.meta.env (without further property access)
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isMetaProperty(node.expression) &&
          node.name.text === 'env'
        ) {
          return ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('process'),
            ts.factory.createIdentifier('env')
          );
        }

        return ts.visitEachChild(node, visit, context);
      }
      return ts.visitNode(sourceFile, visit);
    };
  };
}

module.exports = { name, version, factory };
