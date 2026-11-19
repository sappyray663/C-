#include <iostream>
using namespace std;
int main() {
    int n,c=1;
    cin >> n;
    for (int i = 1; i <= n; i++) {
        if(i%2==0){
            c=0;
        }
        else if(i%2!=0){
            c=1;
        }
        for (int j = 1; j <= i; j++) {
            cout << c;
            if(c==1)
                c=0;
            else
                c=1;
        }
        cout << endl;
    }
    return 0;
}