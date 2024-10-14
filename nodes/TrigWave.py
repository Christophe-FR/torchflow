import torch
import torch.nn as nn
import pytorch_lightning as pl
import matplotlib.pyplot as plt

class TrigWave(pl.LightningModule):
    def __init__(self, wave_type='sine', amplitude=1.0, frequency=1.0, phase=0.0, offset=0.0):
        super(TrigWave, self).__init__()
        
        # Store the wave type and parameters
        self.wave_type = wave_type
        
        # Map wave types to their corresponding functions
        wave_functions = {
            'sine': torch.sin,
            'cosine': torch.cos,
            'tangent': torch.tan,
            'sec': lambda x: torch.reciprocal(torch.cos(x)),
            'csc': lambda x: torch.reciprocal(torch.sin(x)),
            'cot': lambda x: torch.reciprocal(torch.tan(x)),
        }

        if wave_type not in wave_functions:
            raise ValueError(f"Unsupported wave type: {wave_type}")
        
        self.wave_function = wave_functions[wave_type]
        
        # Convert parameters to tensors and ensure they are of the same dtype
        self.amplitude = torch.tensor(amplitude, dtype=torch.float32)
        self.frequency = torch.tensor(frequency, dtype=torch.float32)
        self.phase = torch.tensor(phase, dtype=torch.float32)
        self.offset = torch.tensor(offset, dtype=torch.float32)

    def forward(self, t):
        # Expand time to ensure broadcasting
        t = t.view(-1, *([1] * len(self.amplitude.shape)))

        # Calculate wave
        wave = self.amplitude * self.wave_function(2 * torch.pi * self.frequency * t + self.phase) + self.offset
        
        # Move the time dimension to the last axis
        wave = wave.transpose(0, -1)
        return wave

# Example usage:
if __name__ == "__main__":
    # General shape parameter example
    wave_gen = TrigWave(
        wave_type='sine', 
        amplitude=[[1, 2], [4, 3]], 
        frequency=[1, 5], 
        phase=[[0, torch.pi/4], [0, torch.pi/4]],
        offset=[0, 1]
    )
    t = torch.linspace(0, 1, 100)  # time from 0 to 1 with 100 points
    wave_output = wave_gen(t)
    print(wave_output.shape)  # Output shape should be [100, 2, 2]
    # print(wave_output)  # Display the generated waves

    # Plot wave_output against time
    t = t.numpy()
    wave_output = wave_output.numpy()

    # Flatten dimensions except for time and iterate over the rest to plot each waveform
    shape_except_time = wave_output.shape[:-1]
    wave_output_flat = wave_output.reshape(-1, wave_output.shape[-1])  # Flatten all dimensions except time

    for i in range(wave_output_flat.shape[0]):
        plt.plot(t, wave_output_flat[i], label=f'Wave {i+1}')
    
    plt.xlabel('Time')
    plt.ylabel('Amplitude')
    plt.title(f'{wave_gen.wave_type.capitalize()} Wave')
    plt.legend()
    plt.show()
