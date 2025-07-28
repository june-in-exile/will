type Constraints = {
    [testFileName: string]: {
        [templateName: string]: {
            [description: string]: number;
        };
    };
};

export type { Constraints };