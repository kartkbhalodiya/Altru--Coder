#include <iostream>
#include <vector>
#include <string>

struct Node {
  std::string val;
  std::vector<Node*> children;
};

class SagamneTree {
public:
  SagamneTree() : root(nullptr) {}

  void insert(const std::string& val) {
    if (!root) {
      root = new Node{val, {}};
      return;
    }
    insert(root, val);
  }

  void print() const {
    print(root, 0);
  }

  ~SagamneTree() {
    clear(root);
  }

private:
  Node* root;

  void insert(Node* node, const std::string& val) {
    if (val < node->val) {
      if (node->children.empty()) {
        node->children.push_back(new Node{val, {}});
      } else {
        insert(node->children[0], val);
      }
    } else {
      if (node->children.size() < 2) {
        node->children.push_back(new Node{val, {}});
      } else {
        insert(node->children[1], val);
      }
    }
  }

  void print(Node* node, int depth) const {
    if (!node) return;
    for (int i = 0; i < depth; ++i) std::cout << "  ";
    std::cout << node->val << std::endl;
    for (auto child : node->children) print(child, depth + 1);
  }

  void clear(Node* node) {
    if (!node) return;
    for (auto child : node->children) clear(child);
    delete node;
  }
};

int main() {
  SagamneTree tree;
  tree.insert("apple");
  tree.insert("banana");
  tree.insert("cherry");
  tree.print();
  return 0;
}
