import random

def generate_random_string(length=30):
    password = ""
    digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    small_letters = list("abcdefghijklmnopqrstuvwxyz")
    capital_letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    pass_keys = [digits, small_letters, capital_letters]

    for _ in range(length):
        current_key = random.choice(pass_keys)
        current_char = current_key[random.randint(0, len(current_key) - 1)]
        password += str(current_char)

    return password
