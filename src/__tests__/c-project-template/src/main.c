#include <stdio.h>

unsigned char main(void) {
    int a;

    printf("Hello world\n");

    for (a = 0; a < 10; ++a)
    {
        printf("A = %d\n", a);
    }

    printf("Done\n");

    return 0;
}
