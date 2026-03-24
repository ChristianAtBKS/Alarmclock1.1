using System.Media;
using System.Net.NetworkInformation;
using System.Windows;
using System.Windows.Threading;
using NAudio.Wave;

namespace AlarmClock;

public record SoundOption(string Name, string? RadioUrl = null)
{
    public bool IsRadio => RadioUrl is not null;
    public override string ToString() => Name;
}

public partial class MainWindow : Window
{
    private readonly DispatcherTimer _clockTimer = new();
    private TimeOnly? _alarmTime = null;
    private bool _alarmTriggered = false;

    private IWavePlayer? _waveOut;
    private MediaFoundationReader? _radioReader;

    private static readonly List<SoundOption> Sounds =
    [
        new("🔔 Standard-Alarm"),
        new("🎵 Windows Gong"),
        new("📻 Radio", null),
    ];

    private static readonly List<SoundOption> RadioStations =
    [
        new("Bayern 3",        "https://dispatcher.rndfnk.com/br/br3/live/mp3/128/stream.mp3"),
        new("SWR3",            "https://liveradio.swr.de/sw282p3/swr3/play.mp3"),
        new("Antenne Bayern",  "https://stream.antenne.de/antenne/stream.mp3"),
        new("1LIVE (WDR)",     "https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3"),
        new("WDR 2",           "https://wdr-wdr2-aachenundregion.icecastssl.wdr.de/wdr/wdr2/aachenundregion/mp3/128/stream.mp3"),
        new("NDR 2",           "https://ndr-ndr2-live.sslcast.addradio.de/ndr/ndr2/live/mp3/128/stream.mp3"),
        new("Radio Bob!",      "https://streams.radiobob.de/bob-live/mp3-192/mediaplayer"),
        new("Energy München",  "https://streams.energy.de/energy_mue/mp3-128"),
    ];

    public MainWindow()
    {
        InitializeComponent();

        SoundComboBox.ItemsSource = Sounds;
        SoundComboBox.SelectedIndex = 0;

        RadioComboBox.ItemsSource = RadioStations;
        RadioComboBox.SelectedIndex = 0;

        _clockTimer.Interval = TimeSpan.FromSeconds(1);
        _clockTimer.Tick += ClockTimer_Tick;
        _clockTimer.Start();
        UpdateClock();
    }

    private void SoundComboBox_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (SoundComboBox.SelectedItem is SoundOption opt)
            RadioPanel.Visibility = opt.IsRadio || opt.Name.Contains("Radio")
                ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ClockTimer_Tick(object? sender, EventArgs e) => UpdateClock();

    private void UpdateClock()
    {
        var now = DateTime.Now;
        CurrentTimeText.Text = now.ToString("HH:mm:ss");
        CurrentDateText.Text = now.ToString("dddd, dd. MMMM yyyy",
            new System.Globalization.CultureInfo("de-DE"));

        if (_alarmTime.HasValue && !_alarmTriggered)
        {
            var current = TimeOnly.FromDateTime(now);
            if (current.Hour == _alarmTime.Value.Hour &&
                current.Minute == _alarmTime.Value.Minute &&
                current.Second == 0)
            {
                TriggerAlarm();
            }
        }
    }

    private void TriggerAlarm()
    {
        _alarmTriggered = true;
        StopAlarmButton.IsEnabled = true;

        var selected = SoundComboBox.SelectedItem as SoundOption;
        bool playRadio = selected?.IsRadio == true || selected?.Name.Contains("Radio") == true;

        if (playRadio && RadioComboBox.SelectedItem is SoundOption station && station.RadioUrl is not null)
        {
            if (IsInternetAvailable())
            {
                PlayRadio(station);
                StatusText.Text = $"🔔 Wecker! Spielt: {station.Name}";
            }
            else
            {
                PlayFallback();
                StatusText.Text = "🔔 Wecker! (Kein Internet – Standardton)";
            }
        }
        else
        {
            PlaySystemSound(selected);
            StatusText.Text = "🔔 WECKER KLINGELT!";
        }

        StatusText.Foreground = System.Windows.Media.Brushes.OrangeRed;
        MessageBox.Show("⏰ Wecker! Zeit aufzustehen!", "Weckuhr",
            MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private void PlayRadio(SoundOption station)
    {
        try
        {
            _radioReader = new MediaFoundationReader(station.RadioUrl!);
            _waveOut = new WasapiOut();
            _waveOut.Init(_radioReader);
            _waveOut.Play();
        }
        catch
        {
            PlayFallback();
        }
    }

    private static void PlaySystemSound(SoundOption? option)
    {
        if (option?.Name.Contains("Gong") == true)
            SystemSounds.Hand.Play();
        else
            SystemSounds.Exclamation.Play();
    }

    private static void PlayFallback() => SystemSounds.Exclamation.Play();

    private static bool IsInternetAvailable()
    {
        try
        {
            using var ping = new Ping();
            var reply = ping.Send("8.8.8.8", 1000);
            return reply.Status == IPStatus.Success;
        }
        catch { return false; }
    }

    private void SetAlarmButton_Click(object sender, RoutedEventArgs e)
    {
        if (TimeOnly.TryParse(AlarmTimePicker.Text, out var time))
        {
            _alarmTime = time;
            _alarmTriggered = false;
            StopCurrentSound();

            var selected = SoundComboBox.SelectedItem as SoundOption;
            var extra = (selected?.Name.Contains("Radio") == true && RadioComboBox.SelectedItem is SoundOption s)
                ? $" ({s.Name})" : "";
            StatusText.Text = $"✅ Alarm gesetzt für {time:HH:mm} Uhr – {selected?.Name}{extra}";
            StatusText.Foreground = System.Windows.Media.Brushes.LightGreen;
            StopAlarmButton.IsEnabled = true;
        }
        else
        {
            MessageBox.Show("Bitte gib eine gültige Uhrzeit ein (z. B. 07:30)",
                "Ungültige Eingabe", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private void StopAlarmButton_Click(object sender, RoutedEventArgs e)
    {
        _alarmTime = null;
        _alarmTriggered = false;
        AlarmTimePicker.Text = "07:00";
        StopCurrentSound();
        StatusText.Text = "Kein Alarm gesetzt";
        StatusText.Foreground = System.Windows.Media.Brushes.LightGreen;
        StopAlarmButton.IsEnabled = false;
    }

    private void StopCurrentSound()
    {
        _waveOut?.Stop();
        _waveOut?.Dispose();
        _waveOut = null;
        _radioReader?.Dispose();
        _radioReader = null;
    }
}