const f1 = (a) => {return a + 1;};

module.exports.test_function = () => {
    const f1_value = f1(0);
    return 1 + f1_value;
};

