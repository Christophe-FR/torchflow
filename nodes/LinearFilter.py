import torch
import torch.nn as nn
import torchaudio
import pytorch_lightning as pl
import matplotlib.pyplot as plt

class LinearFilter(pl.LightningModule):
    def __init__(self, b, a =[1]):
        super(LinearFilter, self).__init__()
        
        # Ensure a and b have the same length by padding the shorter one with zeros
        max_len = max(len(a), len(b))
        self.b = nn.Parameter(torch.tensor(b + [0] * (max_len - len(b)), dtype=torch.float32))
        self.a = nn.Parameter(torch.tensor(a + [0] * (max_len - len(a)), dtype=torch.float32))

    def forward(self, x):
        return torchaudio.functional.lfilter(x, self.a, self.b, False)

# Example usage:
if __name__ == "__main__":
    # Generate a sample input waveform (sine wave at 10 Hz with noise)
    sample_rate = 16000
    t = torch.linspace(0, 1, sample_rate)
    sine_wave = torch.sin(2 * torch.pi * 10 * t)
    noise = torch.randn(sample_rate) * 0.5
    noisy_waveform = sine_wave + noise

    # Filter coefficients for a simple low-pass filter (example)
    b = [0.1] * 10
    a = [1.0]

    # Create LinearFilter instance
    filter_gen = LinearFilter(b, a)
    
    # Apply the filter to the noisy waveform
    filtered_waveform = filter_gen(noisy_waveform)
    print(filtered_waveform.shape)  # Output shape should match the input shape

    # Plot the original, noisy, and filtered waveforms
    t = t.numpy()
    sine_wave = sine_wave.numpy()
    noisy_waveform = noisy_waveform.numpy()
    filtered_waveform = filtered_waveform.detach().cpu().numpy()  # Detach and move to CPU before converting to NumPy

    plt.figure(figsize=(12, 8))

    plt.subplot(3, 1, 1)
    plt.plot(t, sine_wave, label='Original Sine Wave (10 Hz)')
    plt.xlabel('Time [s]')
    plt.ylabel('Amplitude')
    plt.title('Original Sine Wave')
    plt.legend()

    plt.subplot(3, 1, 2)
    plt.plot(t, noisy_waveform, label='Noisy Sine Wave', color='red')
    plt.xlabel('Time [s]')
    plt.ylabel('Amplitude')
    plt.title('Noisy Sine Wave')
    plt.legend()

    plt.subplot(3, 1, 3)
    plt.plot(t, filtered_waveform, label='Filtered Waveform', color='orange')
    plt.xlabel('Time [s]')
    plt.ylabel('Amplitude')
    plt.title('Filtered Waveform')
    plt.legend()

    plt.tight_layout()
    plt.show()
