import ast
import os


def get_registered_node(ignore_t=True):
    nodes_folder = './nodes'
    registered_nodes = []

    for root, _, files in os.walk(nodes_folder):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                    
                    # Parse Python file content to AST
                    tree = ast.parse(file_content)
                    
                    # Extract classes information
                    for node in ast.walk(tree):
                        if isinstance(node, ast.ClassDef):
                            class_info = {
                                'class': node.name,
                                'params': [],
                                'in': [],
                                'out': []
                            }

                            # Extract constructor parameters (excluding 'self')
                            for n in node.body:
                                if isinstance(n, ast.FunctionDef) and n.name == '__init__':
                                    params = [
                                        arg.arg for arg in n.args.args 
                                        if arg.arg != 'self'
                                    ]
                                    if ignore_t:
                                        params = [param for param in params if param != 't']
                                    class_info['params'] = params

                            # Extract forward method arguments and returned values
                            for n in node.body:
                                if isinstance(n, ast.FunctionDef) and n.name == 'forward':
                                    inputs = [
                                        arg.arg for arg in n.args.args 
                                        if arg.arg != 'self'
                                    ]
                                    if ignore_t:
                                        inputs = [inp for inp in inputs if inp != 't']
                                    class_info['in'] = inputs
                                    
                                    for stmt in ast.walk(n):
                                        if isinstance(stmt, ast.Return):
                                            if isinstance(stmt.value, ast.Tuple):
                                                outs = [
                                                    elt.id for elt in stmt.value.elts 
                                                    if isinstance(elt, ast.Name)
                                                ]
                                            elif isinstance(stmt.value, ast.Name):
                                                outs = [stmt.value.id]
                                            else:
                                                outs = []
                                            
                                            if ignore_t:
                                                outs = [out for out in outs if out != 't']
                                            class_info['out'] = outs

                            registered_nodes.append(class_info)

    return registered_nodes


if __name__ == '__main__':
    # Example usage:
    # Set ignore_t to True to exclude all 't' from params, in, and out
    nodes = get_registered_node(ignore_t=True)
    print(nodes)
