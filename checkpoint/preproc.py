import pandas as pd

'''
Extract Specific Files and Formats Nicely into Pandas DataFrames
'''

def extract_files(file, students = range(1, 11), test = 'Final') -> list:
    '''
    Finds and extracts all files like file for students for test(s)
    file: format like _.csv, not a path
    test: one of 'Final', 'Midterm 1', or 'Midterm 2'

    Returns: List of DataFrames, List of start time and sample rate
    '''
    base_path = '../all_data/wearable_data/Data/'
    results = []
    start_time = -1
    sample_rate = -1
    for i in students:
        df = pd.read_csv(base_path + f'S{i}/{test}/{file}', header = None)
        # first row is initial time (UTC)
        start_time = df.iloc[0].values[0]
        # second row is sample rate (Hz)
        sample_rate = df.iloc[1].values[0]
        df = df.drop(labels = [0, 1])
        results.append(df)
    
    return results, [start_time, sample_rate]

def concat_results(results: list):
    '''
    Takes the output of results and formalizes it in one dataframe (avoid ACC.csv)
    '''
    assert len(results) > 1

    starting_df = results[0].rename(columns = {0: f's0'})
    for i, df in enumerate(results[1:]):
        df = df.rename(columns = {0: f's{i+1}'})
        starting_df.concat(df)
    
    return starting_df
    
