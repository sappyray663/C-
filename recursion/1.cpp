//to print from 1 to n
#include<iostream>
using namespace std;
void funk(int i,int n){
    if(i>n){
        return;
    }
    else{
        cout<<i<<" ";
        funk(i+1,n);
    }
}
int main(){
    int n;
    cin>>n;
    funk(1,n);
    return 0;
}