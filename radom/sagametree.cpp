// sagametree.cpp - test file
#include <iostream>
#include <vector>
using namespace std;

struct Node {
  int val;
  Node* left;
  Node* right;
  Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

class SagameTree {
public:
  SagameTree() : root(nullptr) {}

  void insert(int val) {
    root = insert(root, val);
  }

  void inorder() {
    inorder(root);
    cout << endl;
  }

private:
  Node* root;

  Node* insert(Node* node, int val) {
    if (!node) return new Node(val);
    if (val < node->val) node->left = insert(node->left, val);
    else node->right = insert(node->right, val);
    return node;
  }

  void inorder(Node* node) {
    if (!node) return;
    inorder(node->left);
    cout << node->val << " ";
    inorder(node->right);
  }
};

int main() {
  SagameTree tree;
  for (int v : {5, 3, 7, 2, 4, 6, 8}) tree.insert(v);
  tree.inorder();
  return 0;
}
