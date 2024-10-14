import torch
import pytorch_lightning as pl
import matplotlib.pyplot as plt

class RandnWave(pl.LightningModule):
    def __init__(self, mean=0.0, std=1.0):
        super(RandnWave, self).__init__()
        
        # Convert parameters to tensors and ensure they are of the same dtype
        self.mean = torch.tensor(mean, dtype=torch.float32)
        self.std = torch.tensor(std, dtype=torch.float32)

    def forward(self, t):
        # Expand time to ensure broadcasting
        t = t.view(-1, *([1] * len(self.mean.shape)))

        # Generate random noise based on mean and std
        random_wave = self.mean + self.std * torch.randn_like(t)

        # Move the time dimension to the last axis
        random_wave = random_wave.transpose(0, -1)
        return random_wave

# Example usage:
if __name__ == "__main__":
    # General shape parameter example
    wave_gen = RandnWave(
        mean=[[0, 1], [1, 0]], 
        std=[1, 0.5]
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
    plt.title(f'Random Wave')
    plt.legend()
    plt.show()
