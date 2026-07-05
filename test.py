def sumOfGoodIntegers(n: int, k: int) -> int:
    total = 0

    for x in range(2*k):
        if (n & x) == 0 and abs(n - x) <= k:
            total += x

    return total


print(sumOfGoodIntegers(4, 4))