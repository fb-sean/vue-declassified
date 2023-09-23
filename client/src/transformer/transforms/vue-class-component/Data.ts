import { copySyntheticComments, removeComments } from "@/helpers/comments.js";
import {
  createCallExpression,
  createConstStatement,
  createLetStatement,
  isPrimitiveType,
} from "@/helpers/tsHelpers.js";
import { namedImports } from "@/helpers/utils.js";
import { VxReferenceKind, VxResultKind, VxTransform } from "@/types.js";
import ts from "typescript";

export const transformData: VxTransform<ts.PropertyDeclaration> = (node, program) => {
  const variableName = node.name.getText();
  const checker = program.getTypeChecker();
  let tag: string = "Data-nonreactive";
  let variableAssignment: ts.VariableStatement;
  let isRef = false;
  let callName: string | undefined;

  if (!node.initializer) {
    // an uninitialized data property on a class is considered an non-reactive variable
    variableAssignment = createLetStatement(variableName, undefined, node.type);
  } else {
    isRef = isPrimitiveType(checker.getTypeAtLocation(node.initializer));
    tag = isRef ? "Data-ref" : "Data-reactive";
    callName = isRef ? "ref" : "reactive";
    const callExpr = createCallExpression(callName, node.type, [removeComments(node.initializer)]);
    variableAssignment = createConstStatement(variableName, callExpr);
  }

  return {
    tag,
    kind: VxResultKind.COMPOSITION,
    imports: callName ? namedImports([callName]) : [],
    reference: isRef ? VxReferenceKind.REF_VARIABLE : VxReferenceKind.VARIABLE,
    outputVariables: [variableName],
    nodes: [copySyntheticComments(variableAssignment, node)],
  };
};
