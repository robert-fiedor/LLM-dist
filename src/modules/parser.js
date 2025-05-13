import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { trace } from '../logger.js';
import { ParseError } from '../errors.js';

/**
 * Parses a JavaScript/TypeScript file and extracts metadata
 * @param {string} content - File content
 * @param {string} filePath - Path to the file (for error reporting)
 * @returns {object} - Extracted metadata
 */
export const parseFile = trace(function parseFile(content, filePath) {
  try {
    // Determine if it's a TypeScript file
    const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');
    
    // Parse the file
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: [
        isTS && 'typescript',
        isJSX && 'jsx',
        'classProperties',
        'classPrivateProperties',
        'decorators-legacy',
      ].filter(Boolean),
    });
    
    // Initialize metadata
    const metadata = {
      symbols: [],
      dependencies: [],
    };
    
    // Traverse the AST to extract metadata
    traverse.default(ast, {
      // Extract imports
      ImportDeclaration(path) {
        const source = path.node.source.value;
        metadata.dependencies.push({
          type: 'import',
          source,
          specifiers: path.node.specifiers.map(spec => {
            if (t.isImportDefaultSpecifier(spec)) {
              return { type: 'default', local: spec.local.name };
            }
            if (t.isImportNamespaceSpecifier(spec)) {
              return { type: 'namespace', local: spec.local.name };
            }
            return { 
              type: 'named', 
              local: spec.local.name, 
              imported: spec.imported ? spec.imported.name : spec.local.name 
            };
          }),
        });
      },
      
      // Extract require statements
      CallExpression(path) {
        if (
          t.isIdentifier(path.node.callee, { name: 'require' }) &&
          path.node.arguments.length === 1 &&
          t.isStringLiteral(path.node.arguments[0])
        ) {
          const source = path.node.arguments[0].value;
          metadata.dependencies.push({
            type: 'require',
            source,
          });
        }
      },
      
      // Extract function declarations
      FunctionDeclaration(path) {
        if (path.node.id) {
          metadata.symbols.push({
            name: path.node.id.name,
            type: 'fn',
            params: path.node.params.map(extractParamInfo),
            returnType: extractTypeAnnotation(path.node.returnType),
            loc: extractLocation(path.node.loc),
          });
        }
      },
      
      // Extract arrow functions assigned to variables
      VariableDeclarator(path) {
        if (path.node.id && t.isIdentifier(path.node.id) && path.node.init) {
          if (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init)) {
            metadata.symbols.push({
              name: path.node.id.name,
              type: 'fn',
              params: path.node.init.params.map(extractParamInfo),
              returnType: extractTypeAnnotation(path.node.init.returnType),
              loc: extractLocation(path.node.loc),
            });
          } else if (!t.isArrowFunctionExpression(path.node.init) && !t.isFunctionExpression(path.node.init)) {
            metadata.symbols.push({
              name: path.node.id.name,
              type: 'const',
              loc: extractLocation(path.node.loc),
            });
          }
        }
      },
      
      // Extract classes
      ClassDeclaration(path) {
        if (path.node.id) {
          const classMetadata = {
            name: path.node.id.name,
            type: 'class',
            fields: [],
            methods: [],
            loc: extractLocation(path.node.loc),
          };
          
          // Extract super class
          if (path.node.superClass && t.isIdentifier(path.node.superClass)) {
            classMetadata.extends = path.node.superClass.name;
          }
          
          // Process class body
          path.node.body.body.forEach(member => {
            if (t.isClassMethod(member)) {
              classMetadata.methods.push({
                name: t.isIdentifier(member.key) ? member.key.name : 
                     (t.isStringLiteral(member.key) ? member.key.value : 'computed'),
                static: member.static,
                kind: member.kind, // "constructor", "method", "get", or "set"
                params: member.params.map(extractParamInfo),
                returnType: extractTypeAnnotation(member.returnType),
                loc: extractLocation(member.loc),
              });
            } else if (t.isClassProperty(member)) {
              classMetadata.fields.push({
                name: t.isIdentifier(member.key) ? member.key.name : 
                     (t.isStringLiteral(member.key) ? member.key.value : 'computed'),
                static: member.static,
                type: extractTypeAnnotation(member.typeAnnotation),
                loc: extractLocation(member.loc),
              });
            }
          });
          
          metadata.symbols.push(classMetadata);
        }
      },
      
      // Extract exports
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          // The export is declaring a new variable/function/class
          // It will be caught by the respective visitors above
        } else {
          // Handle named exports like: export { foo, bar as baz }
          path.node.specifiers.forEach(specifier => {
            metadata.symbols.push({
              name: specifier.exported.name,
              localName: specifier.local.name,
              type: 'export',
              loc: extractLocation(specifier.loc),
            });
          });
        }
      },
      
      ExportDefaultDeclaration(path) {
        metadata.hasDefaultExport = true;
      },
    });
    
    return metadata;
  } catch (err) {
    throw new ParseError(`Failed to parse ${filePath}: ${err.message}`, filePath, err.loc || null);
  }
});

/**
 * Extracts parameter information from AST nodes
 * @param {object} param - Parameter AST node
 * @returns {object} - Parameter metadata
 */
function extractParamInfo(param) {
  if (t.isIdentifier(param)) {
    return {
      name: param.name,
      type: extractTypeAnnotation(param.typeAnnotation),
    };
  }
  
  if (t.isAssignmentPattern(param)) {
    return {
      name: t.isIdentifier(param.left) ? param.left.name : 'destructured',
      hasDefault: true,
      type: extractTypeAnnotation(param.left.typeAnnotation),
    };
  }
  
  if (t.isObjectPattern(param)) {
    return {
      name: 'objectPattern',
      properties: param.properties.map(prop => {
        if (t.isObjectProperty(prop)) {
          return {
            name: t.isIdentifier(prop.key) ? prop.key.name : 'computed',
            type: extractTypeAnnotation(prop.value.typeAnnotation),
          };
        }
        return { name: 'rest' };
      }),
    };
  }
  
  if (t.isArrayPattern(param)) {
    return {
      name: 'arrayPattern',
      elements: param.elements.map(element => {
        if (element && t.isIdentifier(element)) {
          return {
            name: element.name,
            type: extractTypeAnnotation(element.typeAnnotation),
          };
        }
        return null;
      }).filter(Boolean),
    };
  }
  
  if (t.isRestElement(param)) {
    return {
      name: t.isIdentifier(param.argument) ? `...${param.argument.name}` : '...rest',
      type: extractTypeAnnotation(param.typeAnnotation),
    };
  }
  
  return { name: 'unknown' };
}

/**
 * Extracts type annotation from AST nodes
 * @param {object} typeAnnotation - Type annotation AST node
 * @returns {string} - Type as string
 */
function extractTypeAnnotation(typeAnnotation) {
  if (!typeAnnotation) {
    return 'any';
  }
  
  const annotation = typeAnnotation.typeAnnotation || typeAnnotation;
  
  if (t.isTSTypeAnnotation(annotation)) {
    return getTSTypeName(annotation.typeAnnotation);
  }
  
  if (t.isFlowTypeAnnotation(annotation)) {
    // Handle Flow types if needed
    return 'any';
  }
  
  return 'any';
}

/**
 * Gets TypeScript type name
 * @param {object} tsType - TypeScript type AST node
 * @returns {string} - Type as string
 */
function getTSTypeName(tsType) {
  if (!tsType) return 'any';
  
  if (t.isTSStringKeyword(tsType)) return 'string';
  if (t.isTSNumberKeyword(tsType)) return 'number';
  if (t.isTSBooleanKeyword(tsType)) return 'boolean';
  if (t.isTSAnyKeyword(tsType)) return 'any';
  if (t.isTSVoidKeyword(tsType)) return 'void';
  if (t.isTSNullKeyword(tsType)) return 'null';
  if (t.isTSUndefinedKeyword(tsType)) return 'undefined';
  if (t.isTSNeverKeyword(tsType)) return 'never';
  if (t.isTSUnknownKeyword(tsType)) return 'unknown';
  
  if (t.isTSArrayType(tsType)) {
    return `${getTSTypeName(tsType.elementType)}[]`;
  }
  
  if (t.isTSTypeReference(tsType)) {
    if (t.isIdentifier(tsType.typeName)) {
      const name = tsType.typeName.name;
      if (tsType.typeParameters) {
        const params = tsType.typeParameters.params
          .map(getTSTypeName)
          .join(', ');
        return `${name}<${params}>`;
      }
      return name;
    }
  }
  
  if (t.isTSUnionType(tsType)) {
    return tsType.types.map(getTSTypeName).join(' | ');
  }
  
  if (t.isTSIntersectionType(tsType)) {
    return tsType.types.map(getTSTypeName).join(' & ');
  }
  
  return 'any';
}

/**
 * Extracts location information from AST nodes
 * @param {object} loc - Location AST node
 * @returns {object} - Location metadata
 */
function extractLocation(loc) {
  if (!loc) return null;
  
  return {
    start: {
      line: loc.start.line,
      column: loc.start.column,
    },
    end: {
      line: loc.end.line,
      column: loc.end.column,
    },
  };
}

export default {
  parseFile,
}; 