#include <iostream>
using namespace std;

int main() {
    for (int i = 5; i >= 1; i--) {
        for (int j = 1; j <= i; j++) {
            cout << static_cast<char>(65 + j - 1);
        }
        cout << endl;
    }
    return 0;
}