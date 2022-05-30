#include <stdio.h>

static int some(int a)
{
    int b = 8;
    b = a + b;
    return b;
}

unsigned char main(void) {
    int a;

    printf("Hello world\n");

    for (a = 0; a < 10; ++a)
    {
        printf("A = %d\n", some(a));
    }

    printf("Done\n");

    return 0;
}
